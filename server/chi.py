#!/usr/bin/env python2.7
"""
chi.py is used to parallelize computations for association statistics via
chi-squared contingency table calculations.
""" 
import argparse, sys, os, itertools, math, numpy, subprocess, shutil, tempfile
import traceback, numpy
import scipy.stats
import os.path
import tsv

def main (args):
    """
    This tool will create contingency tables depending on the layer counts
    and then utilize these contingency tables to compute a chi-squared p-value.
    This tool will be run within the hexagram.py and has been constructed
    so that all pearson correlation tests may run in parallel, so that compute
    time is shorter and memory will no longer be an issue.

    args[] = 'python'
    args[0] = 'chi.py'
    args[1] = 'temp_directory' - temporary directory to print files to
    args[2] = 'subprocess_string' - string containing sets of four index values:
               layer 1, layer 2, chi2 layer 1, chi2 layer 2; ..."
    args[3] = 'working_directory' - directory to which main process writes files
    args[4] = 'file_index' - index to assign to file for writing purposes
    """

    # Parse the directory to which files will be written
    temp_dir = args[1]
    working_dir = args[3]
    file_index = args[4]

    # Split string into array of array of values, where each element in the 
    # array list is a string of four values, separated by commas
    # comparison_values_separated is an array of arrays such that:
    # [ [layer1, layer2, chi2_layer1, chi2_layer2], [l1,l2,b1,b2],...]
    comparisons = args[2].split(";")
    comparison_indices_separated = []
    for i in comparisons:
        comparison_indices_separated.append(i.split(","))

    # Determine the layer indices and push to a list so that we can create
    # a python dict containing the values for these layers
    # As you parse the layer files, add to the dictionary such that
    # layers [index] [hex_name] returns the integer value
    layer_indices = []
    for comparison_pair in comparison_indices_separated:
        index1 = comparison_pair[0]
        index2 = comparison_pair[1]
        if index1 not in layer_indices:
            layer_indices.append(index1)
        if index2 not in layer_indices:
            layer_indices.append(index2)  
    layers = {}
    for index in layer_indices:
        l_reader = tsv.TsvReader(open(os.path.join(working_dir, "layer_"+ str(index) +".tab"), "r"))
        layer_iterator = l_reader.__iter__()
        layers[index] = {}
        for data_row in layer_iterator:
            layers[index][data_row[0]] = int(float(data_row[1]))
        l_reader.close()

    # Parse the file containing all the hexagon names as a list.
    hex_names = []
    h_reader = tsv.TsvReader(open(os.path.join(temp_dir, "hex_names.tab"), "r"))
    hex_iterator = h_reader.__iter__()
    hex_names = hex_iterator.next()
    h_reader.close()


    # Open the writer which will write three values per line:
    # chi2_index 1      chi2_index2      p_value
    p_writer = tsv.TsvWriter(open(os.path.join(temp_dir, "p_val" + file_index + ".tab"), "w"))

    # Iterate over comparison_indices_separated. Pull out the index indices
    # (first two values). Then, both layers for each hexagon in 
    # hex_names. If the hexagon is found in both layers, account for
    # it in the contingency table counts.
    # Then pass the table to scipy.stats p_value function.
    # Finally, print our chi2_index1, chi2_index 2, and the p_value
    # to the p_val<index>.tab
    for comparison in comparison_indices_separated:
        num_valid = 0
        l1_index = comparison[0]
        l2_index = comparison[1]
        chi2_1_index = comparison[2]
        chi2_2_index = comparison[3]

        # Find the range in each of layer 1 & 2
        layer_values = layers[l1_index].values()
        l1_max = max(layer_values)
        l1_min = min(layer_values)
        layer_values = layers[l2_index].values()
        l2_max = max(layer_values)
        l2_min = min(layer_values)

        # Initialize the contingency table
        table = [[0 for i in range(l2_max - l2_min + 1)] for j in range(l1_max - l1_min + 1)]

        for hexagon in hex_names:
            has_data = True
            try:
                l1_val = layers[l1_index][hexagon]
            except KeyError:
                has_data = False
            try:
                l2_val = layers[l2_index][hexagon]
            except KeyError:
                has_data = False
            if has_data == True:
                num_valid += 1
                table[l1_val - l1_min][l2_val - l2_min] += 1

        try:
            _, p, _, _ = scipy.stats.chi2_contingency(table)
        except ValueError:
            # We probably had all zeros for a column in the contingency table.
            # See <http://stats.stackexchange.com/q/73708>. Chi-squared can't be
            # done in this case, so we make p NaN.
            p = float("NaN")
        p_writer.line (chi2_1_index, chi2_2_index, p)

    p_writer.close()
    return 0

if __name__ == "__main__" :
    try:
        # Get the return code to return
        # Don't just exit with it because sys.exit works by exceptions.
        return_code = main(sys.argv)
    except:
        traceback.print_exc()
        # Return a definite number and not some unspecified error code.
        return_code = 1
        
    sys.exit(return_code)
